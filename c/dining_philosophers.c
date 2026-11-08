/*
 * Dining Philosophers Problem - semaphore solution
 *
 * Compile:  gcc -Wall -Wextra -pthread dining_philosophers.c -o dining_philosophers
 * Run:      ./dining_philosophers
 */
#define _POSIX_C_SOURCE 200809L   /* expose sleep() even with -std=c99 */

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <semaphore.h>
#include <unistd.h>

#define N         5         /* number of philosophers           */
#define ROUNDS    3         /* meals per philosopher            */
#define THINKING  0
#define HUNGRY    1
#define EATING    2

#define LEFT(i)   (((i) + N - 1) % N)   /* left neighbour of i  */
#define RIGHT(i)  (((i) + 1) % N)       /* right neighbour of i */

int   state[N];             /* state of every philosopher       */
int   id[N];                /* thread arguments                 */
sem_t mutex;                /* protects state[]                 */
sem_t S[N];                 /* one semaphore per philosopher    */

/* Let philosopher i eat if it is hungry and neither neighbour is eating.
 * Must be called while holding mutex. */
void test(int i)
{
    if (state[i] == HUNGRY &&
        state[LEFT(i)] != EATING &&
        state[RIGHT(i)] != EATING) {
        state[i] = EATING;
        printf("Philosopher %d takes forks %d and %d and starts EATING\n",
               i + 1, LEFT(i), i);
        sem_post(&S[i]);    /* allow philosopher i to proceed   */
    }
}

/* Acquire both forks or block until they are available. */
void take_forks(int i)
{
    sem_wait(&mutex);       /* enter critical section           */
    state[i] = HUNGRY;
    printf("Philosopher %d is HUNGRY\n", i + 1);
    test(i);                /* try to acquire both forks        */
    sem_post(&mutex);       /* leave critical section           */
    sem_wait(&S[i]);        /* block if forks were not acquired */
}

/* Release both forks and wake neighbours that can now eat. */
void put_forks(int i)
{
    sem_wait(&mutex);       /* enter critical section           */
    state[i] = THINKING;
    printf("Philosopher %d puts down forks %d and %d and is THINKING\n",
           i + 1, LEFT(i), i);
    test(LEFT(i));          /* can the left neighbour eat now?  */
    test(RIGHT(i));         /* can the right neighbour eat now? */
    sem_post(&mutex);       /* leave critical section           */
}

void *philosopher(void *arg)
{
    int i = *(int *)arg;
    int round;

    for (round = 0; round < ROUNDS; round++) {
        sleep(1);           /* think */
        take_forks(i);
        sleep(1);           /* eat   */
        put_forks(i);
    }
    return NULL;
}

int main(void)
{
    pthread_t thread[N];
    int i;

    if (sem_init(&mutex, 0, 1) != 0) {
        perror("sem_init");
        return EXIT_FAILURE;
    }
    for (i = 0; i < N; i++) {
        state[i] = THINKING;
        if (sem_init(&S[i], 0, 0) != 0) {
            perror("sem_init");
            return EXIT_FAILURE;
        }
    }

    for (i = 0; i < N; i++) {
        id[i] = i;
        if (pthread_create(&thread[i], NULL, philosopher, &id[i]) != 0) {
            perror("pthread_create");
            return EXIT_FAILURE;
        }
        printf("Philosopher %d is THINKING\n", i + 1);
    }

    for (i = 0; i < N; i++)
        pthread_join(thread[i], NULL);

    sem_destroy(&mutex);
    for (i = 0; i < N; i++)
        sem_destroy(&S[i]);

    printf("All philosophers finished %d rounds.\n", ROUNDS);
    return EXIT_SUCCESS;
}
